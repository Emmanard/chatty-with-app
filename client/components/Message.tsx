import React from 'react';
import { View, Text, StyleSheet, Image, useColorScheme, TouchableOpacity } from 'react-native';
import { Check, CheckCheck, Clock, Wifi, RotateCw } from 'lucide-react-native';
import { formatMessageTime } from '../lib/utils';

interface MessageProps {
  message: {
    _id: string;
    text?: string;
    image?: string;
    createdAt: string;
    senderId: string | { _id: string; fullName: string; profilePic?: string };
    status?: 'sent' | 'delivered' | 'seen' | 'sending' | 'pending' | 'failed'; // 🆕 Added new statuses
    isDeliveredTo?: Array<{ userId: string; deliveredAt: string }>;
    isSeenBy?: Array<{ userId: string; seenAt: string }>;
    tempId?: string; // 🆕 Added tempId
    error?: string; // 🆕 Added error
  };
  isOwn: boolean;
  senderImage?: string;
  isGroup?: boolean;
  senderName?: string;
  onRetry?: (message: any) => void; // 🆕 Retry callback
}

function MessageComponent({ 
  message, 
  isOwn, 
  senderImage, 
  isGroup = false, 
  senderName,
  onRetry 
}: MessageProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

const renderStatus = () => {
  if (!isOwn) return null;

  // 🆕 Handle new statuses first
  if (message.status === 'sending') {
    return (
      <View style={styles.statusContainer}>
        <Clock size={14} color="#9ca3af" />
      </View>
    );
  }

  if (message.status === 'pending') {
    return (
      <View style={styles.statusContainer}>
        <Wifi size={14} color="#f59e0b" />
      </View>
    );
  }

  if (message.status === 'failed') {
    return (
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => onRetry?.(message)}
      >
        <RotateCw size={14} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  // Existing status logic for groups
  if (isGroup) {
    const deliveredCount = message.isDeliveredTo?.length || 0;
    const seenCount = message.isSeenBy?.length || 0;

    if (seenCount > 0) {
      return (
        <View style={styles.groupReceiptContainer}>
          <CheckCheck size={16} color="#10b981" />
          <Text style={styles.groupReceiptText}>{seenCount}</Text>
        </View>
      );
    } else if (deliveredCount > 0) {
      return (
        <View style={styles.groupReceiptContainer}>
          <CheckCheck size={16} color="#6b7280" />
          <Text style={styles.groupReceiptText}>{deliveredCount}</Text>
        </View>
      );
    } else {
      return <Check size={16} color="#9ca3af" />;
    }
  } else {
    // 🔥 FIX: DM status logic - handle undefined status
    // For DM, use isSeenBy/isDeliveredTo arrays to determine status
    if (message.isSeenBy && message.isSeenBy.length > 0) {
      return <CheckCheck size={16} color="#10b981" />;
    } else if (message.isDeliveredTo && message.isDeliveredTo.length > 0) {
      return <CheckCheck size={16} color="#6b7280" />;
    } else if (message.status === 'sent') {
      return <Check size={16} color="#6b7280" />;
    } else if (!message.status && !message.tempId) {
      // 🔥 OLD MESSAGES from server with no status field - treat as sent
      return <Check size={16} color="#6b7280" />;
    } else {
      // Unknown state - show default
      return <Check size={16} color="#9ca3af" />;
    }
  }
};

  return (
    <View style={[styles.container, isOwn ? styles.containerSent : styles.containerReceived]}>
      <View style={styles.messageWrapper}>
        <Image
          source={{
            uri: senderImage || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
          }}
          style={styles.avatar}
        />
        <View style={styles.messageContent}>
          {isGroup && !isOwn && senderName && (
            <Text style={[styles.senderName, { color: '#3b82f6' }]}>{senderName}</Text>
          )}

          <View style={styles.timestampRow}>
            <Text style={styles.timestamp}>{formatMessageTime(message.createdAt)}</Text>
            {isOwn && <View style={styles.statusIcon}>{renderStatus()}</View>}
          </View>

          <View
            style={[
              styles.messageBubble,
              isOwn
                ? { backgroundColor: '#3b82f6' }
                : { backgroundColor: isDark ? '#374151' : '#f3f4f6' },
              // 🆕 Add visual feedback for failed messages
              message.status === 'failed' && styles.failedMessage,
            ]}
          >
            {message.image && (
              <Image
                source={{ uri: message.image }}
                style={[styles.messageImage, { marginBottom: message.text ? 8 : 0 }]}
                resizeMode="cover"
              />
            )}
            {message.text && (
              <Text
                style={[
                  styles.messageText,
                  isOwn
                    ? { color: '#fff' }
                    : { color: isDark ? '#d1d5db' : '#111827' },
                ]}
              >
                {message.text}
              </Text>
            )}
          </View>

          {/* 🆕 Show error message for failed sends */}
          {message.status === 'failed' && (
            <Text style={styles.errorText}>
              Failed to send. Tap retry icon to try again.
            </Text>
          )}

          {/* 🆕 Show pending indicator */}
          {message.status === 'pending' && (
            <Text style={styles.pendingText}>
              Waiting for connection...
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default React.memo(
  MessageComponent,
  (prevProps, nextProps) =>
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.image === nextProps.message.image &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.senderImage === nextProps.senderImage &&
    prevProps.isGroup === nextProps.isGroup &&
    prevProps.senderName === nextProps.senderName &&
    prevProps.message.isDeliveredTo?.length === nextProps.message.isDeliveredTo?.length &&
    prevProps.message.isSeenBy?.length === nextProps.message.isSeenBy?.length &&
    prevProps.message.tempId === nextProps.message.tempId // 🆕 Added tempId check
);

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  containerSent: { alignItems: 'flex-end' },
  containerReceived: { alignItems: 'flex-start' },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '80%', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  messageContent: { flex: 1 },
  senderName: { fontSize: 12, fontWeight: '500', marginBottom: 2, marginLeft: 4 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 4, gap: 4 },
  timestamp: { fontSize: 12, color: '#6b7280' },
  statusIcon: { marginLeft: 2 },
  // 🆕 New styles
  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  retryButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  failedMessage: {
    borderWidth: 1,
    borderColor: '#ef4444',
    opacity: 0.8,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  pendingText: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 4,
    marginLeft: 4,
  },
  // Existing styles
  groupReceiptContainer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  groupReceiptText: { fontSize: 11, fontWeight: '500', color: '#6b7280' },
  messageBubble: { borderRadius: 12, padding: 12, maxWidth: '100%' },
  messageImage: { width: 200, height: 200, borderRadius: 8 },
  messageText: { fontSize: 16, lineHeight: 20 },
});