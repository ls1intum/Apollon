import * as React from 'react';
import { ErrorInfo } from 'react';

type Props = { onRestoreClick: () => void };

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <>
          <h1>Something went wrong.</h1>
          <button onClick={() => this.props.onRestoreClick()}>Restore previous state</button>
        </>
      );
    }

    return this.props.children;
  }
}
