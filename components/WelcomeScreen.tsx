
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Screen } from '../types';

const WelcomeScreen: React.FC = () => {
  const { setScreen, setError } = useAppContext();

  const handleAuthorize = async () => {
    try {
      // Request camera permission with a more generic constraint to improve compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      // Stop the stream immediately, we just needed the permission
      stream.getTracks().forEach(track => track.stop());
      setScreen(Screen.DRAWING);
    } catch (err) {
      console.error('Camera permission denied:', err);
      setError('获取摄像头权限失败, 请检查设置');
    }
  };

  return (
    <div className="relative flex h-screen min-h-[600px] w-full flex-col group/design-root overflow-hidden bg-gradient-to-b from-yellow-400 to-yellow-200 text-black">
      {/* Background watermarks */}
      <div className="absolute inset-0 z-0 opacity-15">
        <img alt="watermark" className="absolute w-36 h-36 top-[5%] left-[10%] rotate-[15deg]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_1qhQVy9HlxyElE5SXJJ59TASDbTj6jRW0NKzse5yKVW8N2n6XYSETlryR_ydxq6QvvV0rpR66ZFfGaSTKZ985f8pivCCmnXmW1gG3Ju0cjGMrj1w-4AxH54m6tdp3VKrOw0iap691BCcUA31lObgVXMIs8jqeoORqb19eUOAEMGwwRap7jE4B6kUND8Dcb1Xa1ACp0hXJrreZZoIGUg5euFFVKQS6uBpK8CmGBkOgr-w1jf8IWoqjjehR1VLzVYAK8fjtUhzBfit" loading="lazy" decoding="async"/>
        <img alt="watermark" className="absolute w-32 h-32 top-[15%] right-[5%] -rotate-[20deg]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyq4c0R4kW8HpzbUN9KRI2zlM4-73f5bo3Dn6pwyNlA7l45xwewX56GSYLo9UQ54HFEexrZ_IyMOjbYZatjHw8kFEekTBsgZzHj6idlsP6IBG_o98w1MlBLJIl7ZGK27ZZR5wklFn_Ka5YhnxKhGtCBP3PipLWB3Z2NpqN3_SePwiCETG6ltd3ZbONbiUySgHvDH5lh5dVX1L_yv2vFHU-p__YFUuToKYy9HNk4jLlC-SakaVGfVnC1dRUNPtpJwb4ibPIn3wavzTW" loading="lazy" decoding="async"/>
        <img alt="watermark" className="absolute w-40 h-40 bottom-[15%] right-[5%] rotate-[25deg]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8yfstWkYraSuXKlJ1axD_mfXdsCvU7X6IrGL0EqRRxHox2WOJTbKWNFcueh1ceABibRnX0lMSWrYFUaoUdzHPww0o3xAmga_xmQGeVJi5tjiaeOus8tmM_hGhwsfiZEbl0RpCUKiyVf0SncCRC6BTXn_i61epIVyP3xYbcRSzNELKlKslobJjSco-FNFwccQWE8_vYH0sSRBL7bpbpprI7cRi2g4URDjqyWE9RJ6g4icJuVch7cT9LzbS6D5iSVydTs9nzOMDcgHp" loading="lazy" decoding="async"/>
        <img alt="watermark" className="absolute w-28 h-28 bottom-[10%] left-[10%] rotate-[5deg]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWM8WebKothAKnple4sPjoiSRwcHTvpNSMHOR93yR794rx-NbYufdiKgW4RRUBvUQ9nn7278wUrJ1NHpF-pMstny7F0U2KonP0ypgJuf3uuSrZluRcB_uRZPle07km7CpsTMGCOW6OdOKhKNH8o7zuS_CIE-rR-7zDlRQcRhcuQSEE7BVuX1qfEq9cAPyARN2h-XMTV9vEIcL-yOlbmk_pbcJinr_D4KsT7zMmVcRjTh37Kfe2psv2B7-_4HCru7-CjgyfJbWTR36r" loading="lazy" decoding="async"/>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center grow p-6 text-center">
        <div className="flex flex-col items-center p-8 rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg">
          <div className="mb-6 relative">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-yellow-400 border-4 border-transparent bg-clip-padding" style={{borderImage: 'linear-gradient(to right, #f87171, #fbbf24, #a3e635, #34d399, #60a5fa, #a78bfa, #f472b6) 1'}}>
              <span className="material-symbols-outlined text-6xl text-white" style={{textShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>&#xe412;</span>
            </div>
          </div>
          <h1 className="tracking-light text-[32px] font-bold leading-tight pb-3 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500">
            开启魔法画笔
          </h1>
          <p className="max-w-md text-base font-normal leading-normal pb-3 text-gray-800">我们需要摄像头权限来追踪您的指尖，并实时将您的动作变成艺术画作。</p>
        </div>
      </div>
      
      <div className="relative z-10 px-4 pb-8 pt-4">
        <div className="flex py-3">
          <button onClick={handleAuthorize} className="relative flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 flex-1 text-white text-base font-bold leading-normal tracking-[0.015em] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95">
            <span className="truncate z-10">授权摄像头</span>
          </button>
        </div>
        <p className="text-gray-700 text-sm font-normal leading-normal py-3 text-center underline cursor-pointer hover:text-black transition-colors">以后再说</p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
