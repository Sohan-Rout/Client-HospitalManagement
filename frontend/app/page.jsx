import Navbar from "../components/ui/navbar"
import Hero from "../components/home/hero"
import Strip from "../components/home/strip"
import MovingStrip from "../components/home/movingStrip"
import About from "../components/home/about"
import Services from "../components/home/services"
import Team from "../components/home/team"
import Advantage from "../components/home/advantage"
import Faq from "../components/home/faq"
import Cta from "../components/home/cta"
import Footer from "../components/home/footer"

export default function Home(){
    return(
        <main className="relative pt-6 bg-neutral-50/97">
            <div>
                <Navbar />
            </div>

            <div className="max-w-6xl mx-auto">
                <Hero />
            </div>

            <div className="flex items-center justify-center">
              <Strip />
            </div>

            <div className="py-18">
              <MovingStrip />
            </div>

            <div className="max-w-6xl pb-12 mx-auto">
              <About />
            </div>

            <div className="max-w-6xl mx-auto">
                <Services />
            </div>

            <div className="max-w-6xl mx-auto">
                <Team />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <Advantage />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <Faq />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <Cta />
            </div>

            <div className="max-w-6xl mx-auto">
                <Footer />
            </div>
        </main>
    )
}