'use client';

import { useEffect, useState } from 'react';
import { exchangeCodeForToken, getGoogleUserInfo } from '@/lib/tokenService';
import { getAccounts, getGoogleAuthUrl } from '@/lib/googleAuth';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';

export default function Home() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const savedToken = Cookies.get('access_token');

    if (savedToken) {
      setAccessToken(savedToken);
      router.push('/dashboard');
      return;
    }

    if (code) {
      handleAuthFlow(code);
    }
  }, [router]);

  const handleAuthFlow = async (code: string) => {
    try {
      setIsLoading(true);

      const tokens = await exchangeCodeForToken(code);
      const userInfo = await getGoogleUserInfo(tokens.access_token);

      // Save tokens and user info to backend
      const tokenRes = await fetch('http://localhost:8080/tokens/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
        }),
      });

      const savedToken = await tokenRes.json(); 

      const accounts = await getAccounts(tokens.access_token);

      await Promise.all(
        accounts.map(async (account:any) => {
          const publisherId = account.name.split('/')[1];

          const accountPayload = {
            publisher_id: publisherId,
            name: account.name,
            currency_code: account.currencyCode,
            reporting_time_zone: account.reportingTimeZone,
            token: savedToken.token._id,
          };

          await fetch('http://localhost:8080/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountPayload),
          });
        })
      );

      Cookies.set('access_token', tokens.access_token);
      setAccessToken(tokens.access_token);
      router.push('/dashboard');
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-8">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="text-gray-500">Sign in to your account with Google</p>
          </div>

          <Button onClick={handleLogin} className="w-full" variant="outline" disabled={isLoading}>
            {isLoading ? (
              <span>Loading...</span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="21.17" x2="12" y1="8" y2="8" />
                  <line x1="3.95" x2="8.54" y1="6.06" y2="14" />
                  <line x1="10.88" x2="15.46" y1="21.94" y2="14" />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="hidden bg-gray-100 md:block">
        <Image
          src="/placeholder.svg?height=800&width=600"
          alt="Login illustration"
          width={600}
          height={800}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
