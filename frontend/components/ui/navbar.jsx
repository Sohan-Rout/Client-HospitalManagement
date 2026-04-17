import Activity from "lucide-react/dist/esm/icons/activity";
import House from "lucide-react/dist/esm/icons/house";
import TableOfContent from "lucide-react/dist/esm/icons/table-of-contents";
import QuestionMark from "lucide-react/dist/esm/icons/circle-question-mark";
import BookMarkMinus from "lucide-react/dist/esm/icons/bookmark-minus";

const navlinks = [
    {
        icon : <House size={18} />,
        title : "Home",
        link : "/",
    },
    {
        icon : <QuestionMark size={18} />,
        title : "About Us",
        link : "/about",
    },
    {
        icon : <TableOfContent size={18} />,
        title : "Services",
        link : "/services",
    },
    {
        icon : <BookMarkMinus size={18} />,
        title : "Contact Us",
        link : "/contact",
    },
];

export default function Navbar(){
    return(
        <main className="flex bg-none py-2 px-24 justify-between items-center">
            <div className="flex items-center justify-center gap-2">
                <span className="p-2 bg-blue-500 rounded-2xl">
                    <Activity className="text-white" />
                </span>
                <div className="flex flex-col items-start">
                    <h1 className="text-black text-2xl">Doctera</h1>
                </div>
            </div>

            <ul className="flex text-sm gap-2">
                {navlinks.map((item, index) => (
                    <li key={index}>
                        <a href={item.link} className="flex gap-2 items-center px-4 py-2 rounded-full">
                            {item.icon}{item.title}
                        </a>
                    </li>
                ))}
            </ul>

            <a className='px-6 py-3 rounded-full duration-300 hover:bg-blue-400 shadow-lg bg-blue-500 text-white' href="./login">Get Started</a>
        </main>
    );
}