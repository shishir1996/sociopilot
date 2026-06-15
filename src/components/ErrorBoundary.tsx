import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
// AlertTriangle replaced with emoji to avoid lucide-react React error #31

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md text-center space-y-4">
              <span className="h-12 w-12 text-destructive mx-auto inline-block text-5xl">⚠️</span>
              <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error.message}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.href = "/setup/business";
                }}
              >
                Start Over
              </Button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
