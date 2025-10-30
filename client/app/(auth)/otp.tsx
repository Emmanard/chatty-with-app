import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { MessageSquare, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import Toast from 'react-native-toast-message';

export default function OTPScreen() {
//   const { email } = useLocalSearchParams();
//   // Changed from 4 digits to 6 digits
//   const [otp, setOtp] = useState(['', '', '', '', '', '']);
//   const [timer, setTimer] = useState(60);
//   const [canResend, setCanResend] = useState(false);
//   const inputRefs = useRef<TextInput[]>([]);
// //   const { authUser, verifyOTP, resendOTP, isVerifyingOTP, isResendingOTP } =
// //     useAuthStore();

// //   React.useEffect(() => {
// //     if (authUser) {
// //       router.replace('/(tabs)');
// //     }
// //   }, [authUser]);

//   // Timer for resend functionality
//   useEffect(() => {
//     if (timer > 0) {
//       const interval = setInterval(() => {
//         setTimer((prev) => prev - 1);
//       }, 1000);
//       return () => clearInterval(interval);
//     } else {
//       setCanResend(true);
//     }
//   }, [timer]);

//   const handleOtpChange = (value: string, index: number) => {
//     // Only allow numbers
//     if (!/^\d*$/.test(value)) return;

//     const newOtp = [...otp];
//     newOtp[index] = value;
//     setOtp(newOtp);

//     // Auto-focus next input - changed from index < 3 to index < 5
//     if (value && index < 5) {
//       inputRefs.current[index + 1]?.focus();
//     }
//   };

//   const handleKeyPress = (e: any, index: number) => {
//     // Handle backspace
//     if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
//       inputRefs.current[index - 1]?.focus();
//     }
//   };

//   const handleVerifyOTP = async () => {
//     const otpCode = otp.join('');

//     // Changed from length !== 4 to length !== 6
//     if (otpCode.length !== 6) {
//       Toast.show({ type: 'error', text1: 'Please enter complete OTP' });
//       return;
//     }

//     const success = await verifyOTP({ email: email as string, otp: otpCode });

//     if (!success) {
//       // Clear OTP on error - changed to 6 empty strings
//       setOtp(['', '', '', '', '', '']);
//       inputRefs.current[0]?.focus();
//     }
//   };

//   const handleResendOTP = async () => {
//     // const success = await resendOTP(email as string);

//     if (success) {
//       setTimer(60);
//       setCanResend(false);
//       // Changed to 6 empty strings
//       setOtp(['', '', '', '', '', '']);
//       inputRefs.current[0]?.focus();
//     }
//   };

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

  return (
    // <SafeAreaView style={styles.container}>
    //   <KeyboardAvoidingView
    //     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    //     style={styles.keyboardView}
    //   >
    //     <ScrollView contentContainerStyle={styles.scrollContent}>
    //       <View style={styles.content}>
    //         {/* Header */}
    //         <View style={styles.header}>
    //           <TouchableOpacity
    //             onPress={() => router.back()}
    //             style={styles.backButton}
    //           >
    //             <ArrowLeft size={24} color="#374151" />
    //           </TouchableOpacity>
    //         </View>

    //         {/* Logo */}
    //         <View style={styles.logoContainer}>
    //           <View style={styles.logoWrapper}>
    //             <MessageSquare size={24} color="#3b82f6" />
    //           </View>
    //           <Text style={styles.title}>Verify Your Email</Text>
    //           <Text style={styles.subtitle}>
    //             We've sent a 6-digit verification code to{'\n'}
    //             <Text style={styles.email}>{email}</Text>
    //           </Text>
    //         </View>

    //         {/* OTP Input */}
    //         <View style={styles.otpContainer}>
    //           <Text style={styles.otpLabel}>
    //             Enter 6-digit verification code
    //           </Text>
    //           <View style={styles.otpInputContainer}>
    //             {otp.map((digit, index) => (
    //               <TextInput
    //                 key={index}
    //                 ref={(ref) => {
    //                   inputRefs.current[index] = ref!;
    //                 }}
    //                 style={[
    //                   styles.otpInput,
    //                   digit ? styles.otpInputFilled : {},
    //                 ]}
    //                 value={digit}
    //                 onChangeText={(value) => handleOtpChange(value, index)}
    //                 onKeyPress={(e) => handleKeyPress(e, index)}
    //                 keyboardType="numeric"
    //                 maxLength={1}
    //                 textAlign="center"
    //                 selectTextOnFocus
    //               />
    //             ))}
    //           </View>
    //         </View>

    //         {/* Verify Button */}
    //         <TouchableOpacity
    //           style={[
    //             styles.button,
    //             // Changed from length !== 4 to length !== 6
    //             (isVerifyingOTP || otp.join('').length !== 6) &&
    //               styles.buttonDisabled,
    //           ]}
    //           onPress={handleVerifyOTP}
    //           // Changed from length !== 4 to length !== 6
    //           disabled={isVerifyingOTP || otp.join('').length !== 6}
    //         >
    //           {isVerifyingOTP ? (
    //             <ActivityIndicator color="white" />
    //           ) : (
    //             <Text style={styles.buttonText}>Verify Code</Text>
    //           )}
    //         </TouchableOpacity>

    //         {/* Resend Section */}
    //         <View style={styles.resendContainer}>
    //           <Text style={styles.resendText}>Didn't receive the code?</Text>
    //           {canResend ? (
    //             <TouchableOpacity
    //               onPress={handleResendOTP}
    //               disabled={isResendingOTP}
    //               style={styles.resendButton}
    //             >
    //               {isResendingOTP ? (
    //                 <ActivityIndicator size="small" color="#3b82f6" />
    //               ) : (
    //                 <Text style={styles.resendButtonText}>Resend Code</Text>
    //               )}
    //             </TouchableOpacity>
    //           ) : (
    //             <Text style={styles.timerText}>
    //               Resend in {formatTime(timer)}
    //             </Text>
    //           )}
    //         </View>

    //         {/* Footer */}
    //         <View style={styles.footer}>
    //           <Text style={styles.footerText}>
    //             Wrong email?{' '}
    //             <Link href="/(auth)/signup" style={styles.link}>
    //               Go back
    //             </Link>
    //           </Text>
    //         </View>
    //       </View>
    //     </ScrollView>
    //   </KeyboardAvoidingView>
    // </SafeAreaView>
    <></>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Changed back to space-between for 6 inputs
    paddingHorizontal: 16, // Added padding for better spacing
  },
  otpInput: {
    width: 48, // Reduced size for 6 inputs to fit screen
    height: 56, // Reduced height proportionally
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 20, // Reduced font size for better fit
    fontWeight: '600',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  timerText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    color: '#3b82f6',
    fontWeight: '500',
  },
});
