import "../styles/globals.css";
import { useState, useEffect } from "react";
import liff from "@line/liff";

function MyApp({ Component, pageProps }) {
  const [liffObject, setLiffObject] = useState(null);
  const [liffError, setLiffError] = useState(null);

  useEffect(() => {
    // Add diagnostic logs to debug initialization issues.
    console.log("--- LIFF DIAGNOSTIC LOGS START ---");
    try {
      console.log("Current URL:", window.location.href);
      console.log("LIFF is in client:", liff.isInClient());
      console.log("LIFF OS:", liff.getOS());
      console.log("LINE Version:", liff.getLineVersion());
    } catch (e) {
      console.error("Error getting initial LIFF state:", e);
    }
    console.log("--- LIFF DIAGNOSTIC LOGS END ---");


    console.log("start liff.init()...");
    liff
      .init({})
      .then(() => {
        console.log("liff.init() done");
        setLiffObject(liff);
      })
      .catch((error) => {
        console.error(`liff.init() failed: ${error}`);
        setLiffError(error.toString());
      });
  }, []);

  pageProps.liff = liffObject;
  pageProps.liffError = liffError;
  return <Component {...pageProps} />;
}

export default MyApp;
