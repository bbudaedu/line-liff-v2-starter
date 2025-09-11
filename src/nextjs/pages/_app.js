import "../styles/globals.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import liff from "@line/liff";

function MyApp({ Component, pageProps }) {
  const [liffObject, setLiffObject] = useState(null);
  const [liffError, setLiffError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getLiffId = () => {
      switch (router.pathname) {
        case "/cancel":
          return process.env.NEXT_PUBLIC_LIFF_ID_CANCEL;
        case "/transport":
          return process.env.NEXT_PUBLIC_LIFF_ID_TRANSPORT;
        default:
          return process.env.NEXT_PUBLIC_LIFF_ID_INDEX;
      }
    };

    const liffId = getLiffId();

    if (!liffId) {
      console.error("LIFF ID not found for this page.");
      setLiffError("LIFF ID not configured for this page.");
      return;
    }

    console.log(`start liff.init() for page: ${router.pathname} with liffId: ${liffId}...`);
    liff
      .init({ liffId })
      .then(() => {
        console.log("liff.init() done");
        setLiffObject(liff);
      })
      .catch((error) => {
        console.error(`liff.init() failed: ${error}`);
        setLiffError(error.toString());
      });
  }, [router.pathname]);

  pageProps.liff = liffObject;
  pageProps.liffError = liffError;
  return <Component {...pageProps} />;
}

export default MyApp;
