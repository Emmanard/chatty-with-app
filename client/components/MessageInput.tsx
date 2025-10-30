import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ImageIcon, Send, X } from 'lucide-react-native';
import { useChatStore } from '../store/useChatStore';
import { useSendMessage } from '../hooks/useChat';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

interface MessageInputProps {
  onMessageSent?: () => void;
}

export default function MessageInput({ onMessageSent }: MessageInputProps) {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { selectedUser } = useChatStore();
  const sendMessageMutation = useSendMessage(selectedUser?._id || '');
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleImagePicker = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need both camera and photo library permissions to let you upload an image.'
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
        setImagePreview(base64Image);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Image selection failed' });
      console.error('Image picker error:', error);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const handleSendMessage = () => {
    if (!text.trim() && !imagePreview) return;

    sendMessageMutation.mutate(
      {
        text: text.trim(),
        image: imagePreview ?? undefined,
      },
      {
        onSuccess: () => {
          setText('');
          setImagePreview(null);
          onMessageSent?.();
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View
        style={[
          styles.container,
          Platform.OS === 'android' && keyboardHeight > 0 && {
            marginBottom: 0,
          },
        ]}
      >
        {imagePreview && (
          <View style={styles.imagePreviewContainer}>
            <View style={styles.imagePreview}>
              <Image source={{ uri: imagePreview }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (!text.trim() && !imagePreview) return;
              handleSendMessage();
            }}
            editable={!sendMessageMutation.isPending}
          />

          <TouchableOpacity 
            style={styles.imageButton} 
            onPress={handleImagePicker}
            disabled={sendMessageMutation.isPending}
          >
            <ImageIcon size={20} color={imagePreview ? '#10b981' : '#6b7280'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() && !imagePreview) && styles.sendButtonDisabled,
              sendMessageMutation.isPending && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={(!text.trim() && !imagePreview) || sendMessageMutation.isPending}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
  },
  imagePreviewContainer: {
    marginBottom: 12,
  },
  imagePreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    color: '#111827',
    lineHeight: 20,
  },
  imageButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
