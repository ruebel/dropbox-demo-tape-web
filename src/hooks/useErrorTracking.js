import * as React from "react";
import { ERROR_URL } from "../constants";

export function logError(error, info = {}) {
  try {
    const data = {
      env: process.env.NODE_ENV,
      error: error.toString(),
      info: JSON.stringify(info),
      url: window.location.href,
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

export class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    logError(error, info);
  }

  render() {
    return this.props.children;
  }
}
