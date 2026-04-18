import Navbar from "../../components/ui/navbar";
import ServiceHero from "../../components/services/hero";
import Grid from "../../components/services/grid";
import Faq from "../../components/home/faq"
import Cta from "../../components/home/cta";
import Footer from "../../components/home/footer";

export default function Page(){
    return(
        <main>
            <div className="py-6">
                <Navbar />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <ServiceHero />
            </div>

            <div className="max-w-6xl mx-auto py-12">
                <Grid />
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
    );
}