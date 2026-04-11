import { useContext } from "react";
import AppContext from "../context/app-context";

export const useAppContext = () => useContext(AppContext);
