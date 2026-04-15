import Hospital from "lucide-react/dist/esm/icons/hospital";
import Bed from "lucide-react/dist/esm/icons/bed";
import Smartphone from "lucide-react/dist/esm/icons/smartphone";

export default function Hero(){
    return(
        <main
          className="flex flex-col lg:flex-row gap-8 items-center h-[70vh] justify-between"
        >
          <div className="flex flex-col items-center lg:items-start gap-8 max-w-2xl">
            <div className="bg-white px-4 py-2 rounded-full">
                <span className="text-sm">Used by over 100+ Hospitals</span>
            </div>

            <div className="max-w-2xl flex flex-col gap-2">
               <h1 className="text-4xl lg:text-6xl text-center lg:text-left">Unified portal login for every care role</h1> 
               <span className="text-lg text-center lg:text-left">A cleaner hospital sign-in experience for patients, doctors, nurses, and admins</span>
            </div> 

            <div className="flex gap-4">
                <a href="/" className="shadow-lg rounded-full px-6 py-4 bg-orange-500 text-white">Watch Demo</a>
                <a href="/" className="shadow-lg rounded-full px-6 py-4 bg-white text-black">Learn More</a>
            </div>
          </div>
          <div className="w-full rotate-90 scale-90 lg:w-1/2 flex justify-center">
              <video
                  src="/hero.mp4"
                  autoPlay
                  loop
                  muted
                  className=""
              />
          </div>
        </main>
    );
}