import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Connects to Socket.io, joins a route room, cleans up on unmount.
// Returns the socket ref (socket.current) for emitting/listening.
export function useSocket(routeId) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!routeId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_route", routeId);
    });

    return () => {
      socket.emit("leave_route", routeId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [routeId]);

  return socketRef;
}
