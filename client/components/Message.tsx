import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native';
import { formatMessageTime } from '../lib/utils';

interface MessageProps {
  message: {
    _id: string;
    text?: string;
    image?: string;
    createdAt: string;
    senderId: string;
    status?: 'sent' | 'delivered' | 'seen';
  };
  isOwn: boolean;
  senderImage?: string;
}

function MessageComponent({ message, isOwn, senderImage }: MessageProps) {
  const renderStatus = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'seen':
        return <CheckCheck size={16} color="#10b981" />;
      case 'delivered':
        return <CheckCheck size={16} color="#6b7280" />;
      case 'sent':
        return <Check size={16} color="#6b7280" />;
      default:
        return <Check size={16} color="#9ca3af" />;
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
          <View style={styles.timestampRow}>
            <Text style={styles.timestamp}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isOwn && <View style={styles.statusIcon}>{renderStatus()}</View>}
          </View>
          <View style={[styles.messageBubble, isOwn ? styles.bubbleSent : styles.bubbleReceived]}>
            {message.image && (
              <Image
                source={{ uri: message.image }}
                style={[
                  styles.messageImage,
                  { marginBottom: message.text ? 8 : 0 }
                ]}
                resizeMode="cover"
              />
            )}
            {message.text && (
              <Text style={[styles.messageText, isOwn ? styles.textSent : styles.textReceived]}>
                {message.text}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ✅ Memoize to prevent re-rendering unchanged messages
export default React.memo(
  MessageComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.message._id === nextProps.message._id &&
      prevProps.message.text === nextProps.message.text &&
      prevProps.message.image === nextProps.message.image &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.isOwn === nextProps.isOwn &&
      prevProps.senderImage === nextProps.senderImage
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  containerSent: {
    alignItems: 'flex-end',
  },
  containerReceived: {
    alignItems: 'flex-start',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageContent: {
    flex: 1,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusIcon: {
    marginLeft: 2,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    maxWidth: '100%',
  },
  bubbleSent: {
    backgroundColor: '#3b82f6',
  },
  bubbleReceived: {
    backgroundColor: '#f3f4f6',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  textSent: {
    color: 'white',
  },
  textReceived: {
    color: '#111827',
  },
});