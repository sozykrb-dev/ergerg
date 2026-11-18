import React from 'react';
import { MixItModule } from './MixItModule';
import { useLocale } from '../../lib/i18n';
import { Slogan } from '../brand/Logo';
import { Frame } from '../brand/Frame';
import { CircleMark } from '../brand/Logo';

/** The dedicated Limitless Mix page. */
export const MixPage: React.FC = () => {
  const { t } = useLocale();

  return (
    <div>
      <section className="border-b border-[var(--mf-hairline)]">
        <div className="mx-auto grid max-w-[1560px] items-end gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-12 lg:py-16">
          <div>
            <p className="mf-eyebrow flex items-center gap-2">
              <CircleMark className="h-3 w-3" /> {t('Limitless Mix', 'تنسيق بلا حدود')}
            </p>
            <h1 className="mt-4 max-w-[22ch] text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.02] text-brown">
              {t('One piece per category. One tap to the cart.', 'قطعة من كل تصنيف. ضغطة واحدة للسلة.')}
            </h1>
            <p className="mt-5 max-w-[52ch] text-[13px] leading-[1.85] text-[var(--mf-brown-soft)]">
              {t(
                'Pick a top, a bottom, an outer layer and an accessory. The preview stacks them inside the frame. Three pieces or more and the look qualifies for the automatic discount at checkout.',
                'اختر قطعة علوية وسفلية وطبقة خارجية وإكسسوار. تتجمّع المعاينة داخل الإطار. من ثلاث قطع فأكثر تستحق الإطلالة الخصم التلقائي عند إتمام الطلب.'
              )}
            </p>
            <Slogan className="mt-6 block text-[10.5px] uppercase text-maroon" />
          </div>

          <Frame className="hidden h-[180px] w-full bg-cream lg:block" gap={24}>
            <div className="absolute inset-0 grid place-items-center">
              <img src="/img/brand/icon-mark.webp" alt="" aria-hidden="true" className="h-[62%] w-auto opacity-90" />
            </div>
          </Frame>
        </div>
      </section>

      <MixItModule />
    </div>
  );
};
