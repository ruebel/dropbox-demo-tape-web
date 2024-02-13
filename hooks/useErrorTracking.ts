import { ERROR_URL } from "@/utils/constants";
import { Component, PropsWithChildren } from "react";

export function logError(error: Error, info = {}) {
  try {
    const data = {
      env: process.env.NODE_ENV,
      error: error.toString(),
      info: JSON.stringify(info),
      url: typeof window !== "undefined" ? window?.location?.href : "",
      timestamp: new Date(),
    };

    if (process.env.NODE_ENV === "production") {
      fetch(ERROR_URL, {
        body: JSON.stringify(data),
        method: "POST",
      });
      console.error("Error", data);
    } else {
      console.error("Error: would have tracked to server", data);
    }
  } catch (e) {
    console.error("Error logging error", {
      originalError: error,
      logginError: e,
    });
  }
}

export class ErrorBoundary extends Component<PropsWithChildren> {
  componentDidCatch(error: Error, info = {}) {
    logError(error, info);
  }

  render() {
    return this.props.children;
  }
}
