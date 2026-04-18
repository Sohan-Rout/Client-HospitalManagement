import Navbar from "../../components/ui/navbar";
import ContactHero from "../../components/contact/hero";
import Form from "../../components/contact/form";
import Cta from "../../components/home/cta"
import Footer from "../../components/home/footer"

export default function Page(){
    return(
        <main>
            <div className="py-6">
                <Navbar />
            </div>

            <div className="max-w-6xl mx-auto">
                <ContactHero />
            </div>

            <div className="max-w-6xl mx-auto">
                <Form />
            </div>

            <div className="max-w-6xl mx-auto py-24">
                <Cta />
            </div>

            <div className="max-w-6xl mx-auto">
                <Footer />
            </div>
        </main>
    );
}