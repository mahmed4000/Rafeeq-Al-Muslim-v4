import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SafeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Almosala ErrorBoundary caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5ECE1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Feather name="alert-triangle" size={32} color="#8C5E3C" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#5D3A22', marginBottom: 10, textAlign: 'center' }}>
            نعتذر، حدثت مشكلة غير متوقعة
          </Text>
          <Text style={{ fontSize: 13, color: '#7D6858', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
            جاري العمل على تحسين التجربة. يمكنك النقر أدناه للمحاولة مرة أخرى بأمان.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={this.resetError}
            style={{
              backgroundColor: '#8C5E3C',
              paddingVertical: 12,
              paddingHorizontal: 28,
              borderRadius: 24
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>
              إعادة التحميل
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
