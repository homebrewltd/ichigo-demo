import React from "react";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

import Logo from "./logo";
import ThemeSwitch from "./themeSwitch";

const Navbar = () => {
  return (
    <nav className="h-20 flex justify-between items-center">
      <div className="flex gap-2">
        <Logo />
        <span className="font-medium">Ichigo イチゴ</span>
      </div>
      <div className="flex gap-4 text-foreground items-center">
        <FaGithub size={20} />
        <FaDiscord size={24} />
        <FaXTwitter size={20} />
        <ThemeSwitch />
      </div>
    </nav>
  );
};

export default Navbar;
