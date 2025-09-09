import "../styles/globals.css";
import { useState, useEffect } from "react";
import liff from "@line/liff";

function MyApp({ Component, pageProps }) {
  const [liffObject, setLiffObject] = useState(null);
  const [liffError, setLiffError] = useState(null);

  // Execute liff.init() when the app is initialized
  useEffect(() => {
    console.log("start liff.init()...");

    // This new logic makes the app more robust.
    // It uses an environment variable for the LIFF ID if it's provided,
    // which is useful for local testing or single-LIFF deployments.
    // If the variable is not set, it calls liff.init({}), allowing the
    // SDK to auto-detect the LIFF ID when opened from a line://app/ URL.
    // This supports the multi-LIFF app setup.
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const initConfig = {};
    if (liffId) {
      initConfig.liffId = liffId;
    }

    liff
      .init(initConfig)
      .then(() => {
        console.log("liff.init() done");
        setLiffObject(liff);
      })
      .catch((error) => {
        console.error(`liff.init() failed: ${error}`);
        setLiffError(error.toString());
      });
  }, []);

  // Provide `liff` object and `liffError` object
  // to page component as property
  pageProps.liff = liffObject;
  pageProps.liffError = liffError;
  return <Component {...pageProps} />;
}

export default MyApp;
