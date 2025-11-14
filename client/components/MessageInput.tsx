import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Image as ImageIcon, Send, X } from 'lucide-react-native';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';
import { useSendMessage } from '../hooks/useChat';
import { useSendGroupMessage } from '../hooks/useGroup';

interface MessageInputProps {
  onMessageSent?: () => void;
}

export default function MessageInput({ onMessageSent }: MessageInputProps) {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { selectedUser, emitTyping, emitStopTyping } = useChatStore();
  const sendMessageMutation = useSendMessage(selectedUser?._id || '');

  const { selectedGroup, emitGroupTyping, emitStopGroupTyping } = useGroupStore();
  const sendGroupMessageMutation = useSendGroupMessage(selectedGroup?._id || '');

  const textInputRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isGroup = !!selectedGroup;
  const isPending = isGroup ? sendGroupMessageMutation.isPending : sendMessageMutation.isPending;

  // Keyboard listeners
  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showListener.remove(); hideListener.remove(); };
  }, []);

  useEffect(() => () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (newText.length && !isTyping) {
      setIsTyping(true);
      if (isGroup && selectedGroup) emitGroupTyping(selectedGroup._id);
      else if (selectedUser) emitTyping(selectedUser._id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (isGroup && selectedGroup) emitStopGroupTyping(selectedGroup._id);
      else if (selectedUser) emitStopTyping(selectedUser._id);
    }, 500);
  };

  const handleSendMessage = () => {
  if (!text.trim() && !imagePreview) return;
  
  // 🔍 COMPLETE DEBUG - Add this entire block
  const { authUser, isOnline, socket } = useAuthStore.getState();
  const socketConnected = socket?.connected || false;
  
  console.log('═══════════════════════════════════════');
  console.log('🔎 SEND DEBUG:');
  console.log('authUser:', authUser?._id || 'NULL');
  console.log('isOnline:', isOnline);
  console.log('socket.connected:', socketConnected);
  console.log('selectedUser:', selectedUser?._id || 'NULL');
  console.log('selectedGroup:', selectedGroup?._id || 'NULL');
  console.log('messageData:', { text: text.trim(), image: !!imagePreview });
  console.log('═══════════════════════════════════════');
  
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

  const messageData = { text: text.trim(), image: imagePreview ?? undefined };
  if (isGroup) {
    sendGroupMessageMutation.mutate(messageData, {
      onSuccess: () => { setText(''); setImagePreview(null); onMessageSent?.(); },
    });
  } else {
    sendMessageMutation.mutate(messageData, {
      onSuccess: () => { setText(''); setImagePreview(null); onMessageSent?.(); },
    });
  }
};
  const handleBlur = () => {
    if (isTyping) {
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isGroup && selectedGroup) emitStopGroupTyping(selectedGroup._id);
      else if (selectedUser) emitStopTyping(selectedUser._id);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { backgroundColor: isDark ? '#1f1f1f' : '#f3f4f6' }]}>
        {imagePreview && (
          <View style={styles.imagePreviewContainer}>
            <View style={styles.imagePreview}>
              <Image source={{ uri: imagePreview }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setImagePreview(null)}>
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              { backgroundColor: isDark ? '#374151' : '#fff', color: isDark ? '#fff' : '#111827' },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            value={text}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]} onPress={() => {}}>
            <ImageIcon size={20} color={imagePreview ? '#10b981' : '#6b7280'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (isPending || (!text.trim() && !imagePreview)) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={isPending || (!text.trim() && !imagePreview)}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: '#d1d5db', padding: 12 },
  imagePreviewContainer: { marginBottom: 8 },
  imagePreview: { position: 'relative', alignSelf: 'flex-start' },
  previewImage: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  removeImageButton: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, backgroundColor: '#ef4444', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, borderWidth: 1, borderColor: '#d1d5db', lineHeight: 20 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1d5db' },
  sendButton: { width: 44, height: 44, backgroundColor: '#3b82f6', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
});
