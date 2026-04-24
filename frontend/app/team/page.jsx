import Navbar from "../../components/ui/navbar";
import Cta from "../../components/home/cta";
import Footer from "../../components/home/footer";
import TeamHero from "../../components/team/hero";

export default function Page(){
    return(
        <main>
            <div className="py-6">
                <Navbar />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <TeamHero />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <Cta />
            </div>

            <div className="max-w-6xl mx-auto">
                <Footer />
            </div>
        </main>
    );
}