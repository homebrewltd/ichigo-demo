"use client";

import { useEffect, useState } from "react";

const RealtimeTracker: React.FC = () => {
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      setUserCount(Number(event.data)); // Update the user count
    };

    return () => {
      eventSource.close(); // Close the connection when the component unmounts
    };
  }, []);

  return (
    <div>
      <h1>Users Online: {userCount}</h1>
    </div>
  );
};

export default RealtimeTracker;
