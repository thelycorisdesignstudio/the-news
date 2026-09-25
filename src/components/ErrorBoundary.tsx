import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, EditorialMark } from './ui';

/**
 * A screen that throws shows this instead of a blank page. Leaving the screen (a new `resetKey`, i.e. a
 * route change) clears it, so one broken screen never takes the rest of the app down.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[screen error]', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen" role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <EditorialMark />
        <h2 style={{ margin: '24px 0 0', font: '700 24px/1.25 var(--font)', letterSpacing: '-0.03em' }}>this screen hit a problem.</h2>
        <p style={{ margin: '8px 0 24px', maxWidth: 280, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>your stories and settings are safe. try again, or head back to your feed.</p>
        <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button onClick={() => window.location.reload()}>try again</Button>
          <Button variant="light" onClick={() => { window.location.href = '/'; }}>go to my feed</Button>
        </div>
      </div>
    );
  }
}
