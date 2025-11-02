import React, { useState } from 'react';
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
  useColorScheme,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useLogin } from '../../hooks/useAuth';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { authUser } = useAuthStore();
  const loginMutation = useLogin();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  React.useEffect(() => {
    if (authUser) router.replace('/(tabs)');
  }, [authUser]);

  const handleSubmit = () => {
    loginMutation.mutate(formData);
  };

  const colors = {
    background: isDark ? '#1f1f1f' : '#f9fafb',
    card: isDark ? '#2b2b2b' : 'white',
    inputText: isDark ? '#e5e7eb' : '#111827',
    placeholder: '#9ca3af',
    label: '#d1d5db',
    buttonText: 'white',
    subtitle: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={[styles.logoWrapper, { backgroundColor: isDark ? '#3b3b3b' : '#dbeafe' }]}>
                <MessageSquare size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.title, { color: colors.inputText }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.subtitle }]}>Sign in to your account</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.label }]}>Email</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                  <Mail size={20} color={colors.placeholder} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.inputText }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.placeholder}
                    value={formData.email}
                    onChangeText={(email) => setFormData({ ...formData, email })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.label }]}>Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                  <Lock size={20} color={colors.placeholder} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.passwordInput, { color: colors.inputText }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.placeholder}
                    value={formData.password}
                    onChangeText={(password) => setFormData({ ...formData, password })}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={20} color={colors.placeholder} /> : <Eye size={20} color={colors.placeholder} />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text style={styles.buttonText}>Sign in</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.subtitle }]}>
                Don't have an account?{' '}
                <Link href="/(auth)/signup" style={styles.link}>Create account</Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: { maxWidth: 400, alignSelf: 'center', width: '100%' },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  form: { gap: 24 },
  inputContainer: { gap: 8 },
  label: { fontSize: 16, fontWeight: '500' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: 'absolute', right: 12, padding: 4 },
  button: { backgroundColor: '#3b82f6', borderRadius: 8, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 16 },
  link: { color: '#3b82f6', fontWeight: '500' },
});
