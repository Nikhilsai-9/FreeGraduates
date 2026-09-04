import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error && error.message ? error.message : "Something went wrong." };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fg-error-boundary" role="alert">
          <div className="fg-error-boundary__icon">!</div>
          <h2>Something went wrong</h2>
          <p>{this.state.message}</p>
          <div className="fg-error-boundary__actions">
            <button
              type="button"
              className="fg-btn fg-btn--primary"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try again
            </button>
            <button
              type="button"
              className="fg-btn fg-btn--ghost"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}