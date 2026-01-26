import { dbName } from "@/constants/DBConstants";
import { UserType } from "@/context/AuthContext";
import {
  GoogleSignin,
  User as GoogleSigninUser,
  SignInResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

GoogleSignin.configure({
  scopes: ["https://www.googleapis.com/auth/drive.appdata"], // access Drive files
  webClientId:
    "638317174177-1ve9c4m0v1j888j2olehlmgimp3fa392.apps.googleusercontent.com", // for offline access
  offlineAccess: true,
});

export type SignInResult = {
  accessToken: string;
  user: {
    name: string | null;
    email: string | null;
    photo: string | null;
  };
};

export const exportDb = async () => {
  const dbUri = `${FileSystem.documentDirectory}SQLite/${dbName}`;
  const dest = `${FileSystem.documentDirectory}admin-backup.db`;

  try {
    await FileSystem.copyAsync({
      from: dbUri,
      to: dest,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest);
    }
  } catch (error) {
    console.error("Export failed:", error);
  }
};

export const signInNative = async (): Promise<SignInResult> => {
  try {
    // Ensure Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Try silent sign-in first (already signed in)
    const currentUserObj: GoogleSigninUser | null =
      await GoogleSignin.getCurrentUser();

    // Determine actual profile object
    let profile: NonNullable<GoogleSigninUser["user"]> | null = null;

    if (currentUserObj?.user) {
      profile = currentUserObj.user;
    } else {
      // Prompt sign in only if no current user
      const response: SignInResponse = await GoogleSignin.signIn();
      if (response.type !== "success" || !response.data?.user) {
        throw new Error("Google sign-in cancelled or no user info returned");
      }
      profile = response.data.user;
    }

    // Get fresh tokens (accessToken)
    const tokens = await GoogleSignin.getTokens();
    if (!tokens.accessToken) {
      throw new Error("Unable to get Google access token");
    }

    return {
      accessToken: tokens.accessToken,
      user: {
        name: profile.name ?? null,
        email: profile.email, // always string
        photo: profile.photo ?? null,
      },
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("Google sign‑in cancelled");
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services not available");
    }
    throw new Error(error.message || "Google sign‑in failed");
  }
};

export const findBackupFile = async (accessToken: string) => {
  const query = encodeURIComponent(
    "name = 'admin-backup.db' and trashed = false",
  );

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await res.json();
  return data.files?.[0] || null;
};

export const createBackupFile = async (dbPath: string, accessToken: string) => {
  const fileData = await FileSystem.readAsStringAsync(dbPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const metadata = {
    name: "admin-backup.db",
    parents: ["appDataFolder"],
  };

  const boundary = "foo_bar_baz";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/octet-stream\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${fileData}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  return await res.json();
};

export const updateBackupFile = async (
  fileId: string,
  dbPath: string,
  accessToken: string,
) => {
  const fileData = await FileSystem.readAsStringAsync(dbPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: fileData,
    },
  );

  return await res.json();
};

export const backupDbToGoogleDrive = async (): Promise<{
  result: any;
  user: UserType;
}> => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

    const { accessToken, user } = await signInNative();

    // coerce null email to empty string
    const safeUser: UserType = {
      name: user.name ?? null,
      email: user.email ?? "",
      photo: user.photo ?? null,
    };

    const existingFile = await findBackupFile(accessToken);

    let result;
    if (existingFile) {
      result = await updateBackupFile(existingFile.id, dbPath, accessToken);
    } else {
      result = await createBackupFile(dbPath, accessToken);
    }

    if (!result || result.error) {
      throw new Error(result?.error?.message || "Google Drive backup failed");
    }

    return { result, user: safeUser };
  } catch (err: any) {
    console.error("Backup error:", err);

    // Normalize error message
    if (err?.message) {
      throw new Error(err.message);
    }

    throw new Error("Unexpected error during backup");
  }
};
