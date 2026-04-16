import Navbar from "../components/ui/navbar"
import Hero from "../components/home/hero"
import Strip from "../components/home/strip"
import MovingStrip from "../components/home/movingStrip"
import About from "../components/home/about"
import Services from "../components/home/services"
import Team from "../components/home/team"

export default function Home(){
    return(
        <main className="relative space-y-8 pb-12 pt-6 bg-neutral-50/97 md:space-y-10 md:pb-20">
            <div>
                <Navbar />
            </div>

            <div>
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
        </main>
    )
}