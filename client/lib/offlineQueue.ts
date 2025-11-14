import AsyncStorage from '@react-native-async-storage/async-storage';

const DM_QUEUE_KEY = 'pending_dm_messages';
const GROUP_QUEUE_KEY = 'pending_group_messages';

// ============================================
// DM QUEUE FUNCTIONS
// ============================================
export const getDMPendingMessages = async () => {
  try {
    const stored = await AsyncStorage.getItem(DM_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading DM queue:', error);
    return [];
  }
};

export const addToDMQueue = async (message: any) => {
  try {
    const queue = await getDMPendingMessages();
    queue.push(message);
    await AsyncStorage.setItem(DM_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error adding to DM queue:', error);
  }
};

export const removeFromDMQueue = async (tempId: string) => {
  try {
    const queue = await getDMPendingMessages();
    const filtered = queue.filter((msg: any) => msg.tempId !== tempId);
    await AsyncStorage.setItem(DM_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from DM queue:', error);
  }
};

export const clearDMQueue = async () => {
  try {
    await AsyncStorage.removeItem(DM_QUEUE_KEY);
  } catch (error) {
    console.error('Error clearing DM queue:', error);
  }
};

// ============================================
// GROUP QUEUE FUNCTIONS
// ============================================
export const getGroupPendingMessages = async () => {
  try {
    const stored = await AsyncStorage.getItem(GROUP_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading group queue:', error);
    return [];
  }
};

export const addToGroupQueue = async (message: any) => {
  try {
    const queue = await getGroupPendingMessages();
    queue.push(message);
    await AsyncStorage.setItem(GROUP_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error adding to group queue:', error);
  }
};

export const removeFromGroupQueue = async (tempId: string) => {
  try {
    const queue = await getGroupPendingMessages();
    const filtered = queue.filter((msg: any) => msg.tempId !== tempId);
    await AsyncStorage.setItem(GROUP_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from group queue:', error);
  }
};

export const clearGroupQueue = async () => {
  try {
    await AsyncStorage.removeItem(GROUP_QUEUE_KEY);
  } catch (error) {
    console.error('Error clearing group queue:', error);
  }
};