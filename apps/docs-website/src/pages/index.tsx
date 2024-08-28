import clsx from 'clsx';
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '../components/HomepageFeatures';

import styles from './index.module.css';
import ImageSwitcher from '../components/ImageSwitcher';
import Banner from '../components/Banner/Banner';

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--secondary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.titleContainer}>
          {/* <ImageSwitcher
            lightImageSrc={"img/logos/revisitLogoThumbnail-dotted-light.svg"}
            darkImageSrc={"img/logos/revisitLogoThumbnail-dotted-dark.svg"}
            className={clsx(styles.largeItem, styles.homepageLogo)}
          />
          <ImageSwitcher
            lightImageSrc={"img/logos/revisitLogoLong.svg"}
            darkImageSrc={"img/logos/revisitLogoLong-dark.svg"}
            className={clsx(styles.smallItem, styles.homepageLogo)}
          /> */}
          <div className={clsx('hero__title', styles.description)}>
            Cell Microscopy Data Visualization
          </div>
        </div>
        {/* <img src="img/logos/revisitLogoLong.svg" style={{width:'60%'}}/> */}
        {/* <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p> */}
        <div className={styles.buttons} style={{ marginTop: '50px' }}>
          <Link
            className="button button--secondary button--lg"
            to="/about">
            About Loon
          </Link>
          <Link
            className="button button--primary button--lg"
            to="/docs/introduction">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      description={`${siteConfig.tagline}`}>
      {/* <Banner /> */}
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
