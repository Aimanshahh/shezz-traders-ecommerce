import HeroSection from '../components/home/HeroSection.jsx'
import TrustFeatures from '../components/home/TrustFeatures.jsx'
import FeaturedDevices from '../components/home/FeaturedDevices.jsx'
import TrustBar from '../components/home/TrustBar.jsx'
import Testimonial from '../components/home/Testimonials.jsx'
import FAQS from "../components/home/FAQ.jsx"
 

export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustFeatures />
      <FeaturedDevices />
      <TrustBar /> 
            <Testimonial />
<FAQS />
    </>
  )
}