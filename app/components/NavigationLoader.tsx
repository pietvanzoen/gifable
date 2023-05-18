import { useEffect, useState } from "react";
import { useNavigation } from "@remix-run/react";

export default function Loader() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      setIsLoading(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      if (["submitting", "loading"].includes(navigation.state)) {
        setIsLoading(true);
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [navigation.state]);

  if (!isLoading) {
    return null;
  }

  return <div tabIndex={-1} aria-hidden="true" className="loader"></div>;
}
