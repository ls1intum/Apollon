import * as React from 'react';
import { ErrorInfo } from 'react';

type Props = { onError: (error: Error) => void };

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ hasError: true, error: error });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // restore the state immediately
      this.props.onError(this.state.error);
      return;
    }

    return this.props.children;
  }
}
