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
} from 'react-native';
import { Camera, Mail, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import * as ImagePicker from 'expo-image-picker';
import { useUpdateProfile } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { authUser } = useAuthStore();
  const updateProfileMutation = useUpdateProfile();
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

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
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Your profile information</Text>
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
                style={styles.avatar}
              />
              <TouchableOpacity
                style={[
                  styles.cameraButton,
                  updateProfileMutation.isPending && styles.cameraButtonDisabled,
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
            <Text style={styles.avatarText}>
              {updateProfileMutation.isPending
                ? 'Uploading...'
                : 'Click the camera icon to update your photo'}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <User size={16} color="#6b7280" />
                <Text style={styles.infoLabel}>Full Name</Text>
              </View>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{authUser?.fullName}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Mail size={16} color="#6b7280" />
                <Text style={styles.infoLabel}>Email Address</Text>
              </View>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{authUser?.email}</Text>
              </View>
            </View>
          </View>

          <View style={styles.accountSection}>
            <Text style={styles.accountTitle}>Account Information</Text>
            <View style={styles.accountInfo}>
              <View style={styles.accountItem}>
                <Text style={styles.accountLabel}>Member Since</Text>
                <Text style={styles.accountValue}>
                  {authUser?.createdAt ? formatMemberSince(authUser.createdAt) : 'N/A'}
                </Text>
              </View>
              <View style={styles.accountItem}>
                <Text style={styles.accountLabel}>Account Status</Text>
                <Text style={[styles.accountValue, styles.activeStatus]}>
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '600', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280' },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    backgroundColor: '#111827',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonDisabled: { opacity: 0.6 },
  avatarText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
  },
  infoSection: { gap: 24, marginBottom: 32 },
  infoItem: { gap: 6 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValueContainer: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoValue: { fontSize: 16, color: '#111827' },
  accountSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 24,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 16,
  },
  accountInfo: { gap: 12 },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  accountLabel: { fontSize: 14, color: '#374151' },
  accountValue: { fontSize: 14, color: '#111827' },
  activeStatus: { color: '#10b981', fontWeight: '500' },
});
