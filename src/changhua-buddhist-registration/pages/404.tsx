import React from 'react';
import Head from 'next/head';
import { ErrorPage } from '../components/error/ErrorPage';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>頁面不存在 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="您要找的頁面不存在" />
      </Head>
      <ErrorPage 
        statusCode={404}
        onHome={() => window.location.href = '/'}
      />
    </>
  );
}