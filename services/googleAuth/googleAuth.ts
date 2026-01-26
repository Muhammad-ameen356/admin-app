import { GoogleSignin } from "@react-native-google-signin/google-signin";

export const getLoggedInUser = async () => {
  try {
    const userInfo = await GoogleSignin.getCurrentUser();

    if (!userInfo) {
      return null; // user not signed in
    }

    return {
      name: userInfo.user.name,
      email: userInfo.user.email,
      photo: userInfo.user.photo, // optional profile pic
    };
  } catch (err) {
    console.error("Failed to get logged-in user:", err);
    return null;
  }
};

export const logOutFromGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    console.error("Failed to get logged-in user:", err);
    return null;
  }
};
