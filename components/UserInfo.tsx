import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { getLoggedInUser } from "../services/googleAuth/googleAuth";

const UserInfo = () => {
  const [user, setUser] = useState<{
    name: string;
    email: string;
    photo?: string;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const info = await getLoggedInUser();
      setUser(
        info
          ? {
              name: info.name || "Unknown",
              email: info.email,
              photo: info.photo || undefined,
            }
          : null,
      );
    };
    fetchUser();
  }, []);

  if (!user) {
    return <Text>No account signed in</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {user.photo && (
        <Image
          source={{ uri: user.photo }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      )}
      <Text>
        {user.name} ({user.email})
      </Text>
    </View>
  );
};

export default UserInfo;
