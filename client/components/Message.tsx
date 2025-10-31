import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { formatMessageTime } from '../lib/utils';

interface MessageProps {
  message: {
    _id: string;
    text?: string;
    image?: string;
    createdAt: string;
    senderId: string;
  };
  isOwn: boolean;
  senderImage?: string;
}

function MessageComponent({ message, isOwn, senderImage }: MessageProps) {
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
          <Text style={styles.timestamp}>
            {formatMessageTime(message.createdAt)}
          </Text>
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
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 4,
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
