import Navbar from "../../components/ui/navbar";
import AboutHero from "../../components/about/hero";
import AboutUs from "../../components/about/aboutUs";
import Advantage from "../../components/home/advantage"

export default function Page(){
    return(
        <main>
            <div className="py-6">
                <Navbar />
            </div>

            <div className="py-8 max-w-6xl mx-auto">
                <AboutHero />
            </div>

            <div className="max-w-6xl mx-auto py-8">
                <AboutUs />
            </div>

            <div className="max-w-6xl mx-auto py-24">
                <Advantage />
            </div>
        </main>
    );
}