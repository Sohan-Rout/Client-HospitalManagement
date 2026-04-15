import Navbar from "../components/ui/navbar"
import Hero from "../components/home/hero"

export default function Home(){
    return(
        <main className="relative space-y-8 pb-12 pt-6 bg-neutral-50/97 md:space-y-10 md:pb-20">
            <div>
                <Navbar />
            </div>

            <div>
                <Hero />
            </div>
        </main>
    )
}