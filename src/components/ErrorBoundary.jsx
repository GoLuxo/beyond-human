import { Component } from 'react';
import { RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Beyond Human] screen crashed', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty crash">
        <h4>This screen hit a problem</h4>
        <p>Your data is safe. Try another screen from the sidebar, or reload the app.</p>
        <code>{String(this.state.error?.message ?? this.state.error)}</code>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <RotateCcw /> Reload
        </button>
      </div>
    );
  }
}
