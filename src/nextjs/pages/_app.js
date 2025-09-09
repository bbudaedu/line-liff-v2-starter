import "../styles/globals.css";
import { useState, useEffect } from "react";
import liff from "@line/liff";

function MyApp({ Component, pageProps }) {
  const [liffObject, setLiffObject] = useState(null);
  const [liffError, setLiffError] = useState(null);

  // Execute liff.init() when the app is initialized
  useEffect(() => {
    // to avoid sending error to Sentry
    console.log("start liff.init()...");
    // Calling liff.init() with an empty object ensures that the function
    // receives a defined object, preventing "Cannot read properties of undefined"
    // errors in some versions of the LIFF SDK, while still allowing auto-detection
    // of the liffId.
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

  // Provide `liff` object and `liffError` object
  // to page component as property
  pageProps.liff = liffObject;
  pageProps.liffError = liffError;
  return <Component {...pageProps} />;
}

export default MyApp;
