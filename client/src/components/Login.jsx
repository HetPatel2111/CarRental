import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import { getErrorMessage } from "../utils/formatters";

const Login = () => {
    const { setShowLogin, axios, setToken } = useAppContext();
    const navigate = useNavigate();

    const [state, setState] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmitHandler = async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const { data } = await axios.post(`/api/user/${state}`, {
                name,
                email,
                password,
            });

            if (data.success) {
                setToken(data.token);
                navigate("/");
                toast.success(state === "login" ? "Login successful" : "Account created successfully");
                setShowLogin(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            onClick={() => setShowLogin(false)}
            className="fixed inset-0 z-100 flex items-center bg-black/50 text-sm text-gray-600"
        >
            <form
                onSubmit={onSubmitHandler}
                onClick={(event) => event.stopPropagation()}
                className="m-auto flex w-80 flex-col items-start gap-4 rounded-lg border border-gray-200 bg-white p-8 py-12 text-gray-500 shadow-xl"
            >
                <p className="m-auto text-2xl font-medium">
                    <span className="text-primary">User</span> {state === "login" ? "Login" : "Sign Up"}
                </p>

                {state === "register" ? (
                    <div className="w-full">
                        <p>Name</p>
                        <input
                            onChange={(event) => setName(event.target.value)}
                            value={name}
                            placeholder="Type here"
                            className="mt-1 w-full rounded border border-gray-200 p-2 outline-primary"
                            type="text"
                            required
                        />
                    </div>
                ) : null}

                <div className="w-full">
                    <p>Email</p>
                    <input
                        onChange={(event) => setEmail(event.target.value)}
                        value={email}
                        placeholder="Type here"
                        className="mt-1 w-full rounded border border-gray-200 p-2 outline-primary"
                        type="email"
                        required
                    />
                </div>

                <div className="w-full">
                    <p>Password</p>
                    <input
                        onChange={(event) => setPassword(event.target.value)}
                        value={password}
                        placeholder="Minimum 8 characters"
                        className="mt-1 w-full rounded border border-gray-200 p-2 outline-primary"
                        type="password"
                        minLength={8}
                        required
                    />
                </div>

                {state === "register" ? (
                    <p>
                        Already have an account?{" "}
                        <button type="button" onClick={() => setState("login")} className="cursor-pointer text-primary">
                            Log in
                        </button>
                    </p>
                ) : (
                    <p>
                        Need an account?{" "}
                        <button
                            type="button"
                            onClick={() => setState("register")}
                            className="cursor-pointer text-primary"
                        >
                            Sign up
                        </button>
                    </p>
                )}

                <button
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-primary py-2 text-white transition-all hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSubmitting ? "Please wait..." : state === "register" ? "Create Account" : "Login"}
                </button>
            </form>
        </div>
    );
};

export default Login;
