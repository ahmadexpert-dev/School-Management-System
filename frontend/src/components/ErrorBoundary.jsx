import { Component } from 'react';

// Without this, any uncaught render/effect error anywhere in the app
// blanks the entire page to white with zero indication anything went
// wrong (observed live: a corrupted localStorage value threw inside
// AuthProvider and took down the whole tree). This is the last line of
// defense — a friendly recoverable screen instead of silence.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught error', error, info);
  }

  handleReload = () => {
    // Clearing storage before reload covers the common case (a corrupted
    // session value) without requiring the user to know how to open
    // DevTools and clear it themselves.
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="bg-white shadow-lg rounded-2xl p-8 max-w-sm w-full text-center border border-slate-100">
            <h1 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-4">
              An unexpected error occurred. Reloading usually fixes this.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
