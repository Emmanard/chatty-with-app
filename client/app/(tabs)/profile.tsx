import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { Camera, Mail, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import * as ImagePicker from 'expo-image-picker';
import { useUpdateProfile } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { authUser } = useAuthStore();
  const updateProfileMutation = useUpdateProfile();
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleImageUpload = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (
        cameraPermission.status !== 'granted' ||
        mediaLibraryPermission.status !== 'granted'
      ) {
        Alert.alert(
          'Permission Denied',
          'Please grant camera and photo library permissions from your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSelectedImg(base64Image);
        updateProfileMutation.mutate({ profilePic: base64Image });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image upload error:', error);
    }
  };

  const formatMemberSince = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1f1f1f' : '#f9fafb' },
      ]}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#f9fafb' : '#111827' },
              ]}
            >
              Profile
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? '#9ca3af' : '#6b7280' },
              ]}
            >
              Your profile information
            </Text>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    selectedImg ||
                    authUser?.profilePic ||
                    'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
                }}
                style={[
                  styles.avatar,
                  { borderColor: isDark ? '#374151' : 'white' },
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.cameraButton,
                  updateProfileMutation.isPending &&
                    styles.cameraButtonDisabled,
                  { backgroundColor: isDark ? '#374151' : '#111827' },
                ]}
                onPress={handleImageUpload}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Camera size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.avatarText,
                { color: isDark ? '#9ca3af' : '#6b7280' },
              ]}
            >
              {updateProfileMutation.isPending
                ? 'Uploading...'
                : 'Click the camera icon to update your photo'}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <User size={16} color={isDark ? '#d1d5db' : '#6b7280'} />
                <Text
                  style={[
                    styles.infoLabel,
                    { color: isDark ? '#d1d5db' : '#6b7280' },
                  ]}
                >
                  Full Name
                </Text>
              </View>
              <View
                style={[
                  styles.infoValueContainer,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#4b5563' : '#e5e7eb',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoValue,
                    { color: isDark ? '#f9fafb' : '#111827' },
                  ]}
                >
                  {authUser?.fullName}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Mail size={16} color={isDark ? '#d1d5db' : '#6b7280'} />
                <Text
                  style={[
                    styles.infoLabel,
                    { color: isDark ? '#d1d5db' : '#6b7280' },
                  ]}
                >
                  Email Address
                </Text>
              </View>
              <View
                style={[
                  styles.infoValueContainer,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#4b5563' : '#e5e7eb',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoValue,
                    { color: isDark ? '#f9fafb' : '#111827' },
                  ]}
                >
                  {authUser?.email}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.accountSection,
              { backgroundColor: isDark ? '#374151' : '#f3f4f6' },
            ]}
          >
            <Text
              style={[
                styles.accountTitle,
                { color: isDark ? '#f9fafb' : '#111827' },
              ]}
            >
              Account Information
            </Text>
            <View style={styles.accountInfo}>
              <View style={styles.accountItem}>
                <Text
                  style={[
                    styles.accountLabel,
                    { color: isDark ? '#d1d5db' : '#374151' },
                  ]}
                >
                  Member Since
                </Text>
                <Text
                  style={[
                    styles.accountValue,
                    { color: isDark ? '#f9fafb' : '#111827' },
                  ]}
                >
                  {authUser?.createdAt
                    ? formatMemberSince(authUser.createdAt)
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.accountItem}>
                <Text
                  style={[
                    styles.accountLabel,
                    { color: isDark ? '#d1d5db' : '#374151' },
                  ]}
                >
                  Account Status
                </Text>
                <Text
                  style={[
                    styles.accountValue,
                    styles.activeStatus,
                    { color: '#3b82f6' },
                  ]}
                >
                  Active
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonDisabled: { opacity: 0.6 },
  avatarText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  infoSection: { gap: 24, marginBottom: 32 },
  infoItem: { gap: 6 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14 },
  infoValueContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoValue: { fontSize: 16 },
  accountSection: { borderRadius: 12, padding: 24 },
  accountTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16 },
  accountInfo: { gap: 12 },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  accountLabel: { fontSize: 14 },
  accountValue: { fontSize: 14 },
  activeStatus: { fontWeight: '500' },
});
