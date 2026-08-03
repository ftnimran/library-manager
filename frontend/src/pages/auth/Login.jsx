import { useState, useEffect, useRef } from "react";
import { useLibrary } from "../../context/LibraryContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");

  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [isOtpVerified, setIsOtpVerified] = useState(false); // 🚀 Sirf true hone par green tick aayega

  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);

  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const {
    login,
    signup,
    showAlert,
    forgotPasswordSendOtp,
    verifyResetOtp,
    resetPassword,
  } = useLibrary();
  const navigate = useNavigate();

  // OTP Timer Logic
  useEffect(() => {
    let interval;
    if (forgotStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [forgotStep, otpTimer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhone(value);
  };

  const handleOtpChange = (index, e) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value.substring(value.length - 1);
    setOtpValues(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .replace(/\s/g, "")
      .slice(0, 6)
      .split("");
    if (pasteData.some((char) => isNaN(char))) return;

    const newOtp = [...otpValues];
    pasteData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtpValues(newOtp);

    const focusIndex = Math.min(pasteData.length, 5);
    otpRefs.current[focusIndex].focus();
  };

  // 🚀 REAL-TIME OTP AUTO-VERIFICATION (No fake green ticks)
  const verifyOtpNow = async (fOtp) => {
    setIsForgotSubmitting(true);
    try {
      const fEmail = forgotEmail.replace(/\s/g, "").toLowerCase();
      const res = await verifyResetOtp(fEmail, fOtp);

      if (res.success) {
        setIsOtpVerified(true); // Iske true hone se instantly green tick aayega aur boxes green honge
        setTimeout(() => {
          setForgotStep(3);
          setIsOtpVerified(false);
          setIsForgotSubmitting(false);
        }, 1000); // 1 second ka premium pause animation dikhane ke liye
      } else {
        showAlert(res.message, "Invalid OTP", "error");
        setOtpValues(["", "", "", "", "", ""]); // OTP galat hone par wapas khali kar do
        setIsForgotSubmitting(false);
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      }
    } catch (error) {
      showAlert("An unexpected error occurred.", "Error", "error");
      setIsForgotSubmitting(false);
    }
  };

  // Trigger Auto-Verify as soon as 6 digits are entered
  useEffect(() => {
    const otpStr = otpValues.join("");
    if (
      forgotStep === 2 &&
      otpStr.length === 6 &&
      !isForgotSubmitting &&
      !isOtpVerified &&
      otpTimer > 0
    ) {
      verifyOtpNow(otpStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalIdentifier = identifier.replace(/\s/g, "").toLowerCase();
    const finalPassword = password.replace(/\s/g, "");
    const finalName = name.trim();
    const finalUsername = username.replace(/\s/g, "").toLowerCase();
    const finalEmail = email.replace(/\s/g, "").toLowerCase();

    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        const res = await login(finalIdentifier, finalPassword);
        if (res.success) {
          navigate("/");
        } else {
          showAlert(res.message, "Login Failed", "error");
        }
      } else {
        if (!/^[a-zA-Z\s]+$/.test(finalName)) {
          showAlert(
            "Name can only contain letters and spaces.",
            "Invalid Name",
            "warning",
          );
          return;
        }
        if (!/^[a-z0-9_-]+$/.test(finalUsername)) {
          showAlert(
            "Username can only contain letters, numbers, underscores (_), and hyphens (-).",
            "Invalid Username",
            "warning",
          );
          return;
        }
        if (phone.length < 10) {
          showAlert(
            "Mobile Number must be at least 10 digits.",
            "Invalid Input",
            "warning",
          );
          return;
        }
        if (!/^[a-zA-Z0-9@]+$/.test(finalPassword)) {
          showAlert(
            "Password can only contain letters, numbers, and the '@' symbol. No spaces allowed.",
            "Invalid Password",
            "warning",
          );
          return;
        }

        const res = await signup({
          name: finalName,
          username: finalUsername,
          email: finalEmail,
          phone,
          password: finalPassword,
        });
        if (res.success) {
          navigate("/");
        } else {
          showAlert(res.message, "Signup Failed", "error");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setShowPassword(false);
    setIdentifier("");
    setPassword("");
    setName("");
    setUsername("");
    setEmail("");
    setPhone("");
  };

  const handleResendOtp = async () => {
    setIsForgotSubmitting(true);
    try {
      const fEmail = forgotEmail.replace(/\s/g, "").toLowerCase();
      const res = await forgotPasswordSendOtp(fEmail);
      if (res.success) {
        setOtpTimer(60);
        setOtpValues(["", "", "", "", "", ""]);
        setIsOtpVerified(false);
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      } else {
        showAlert(res.message, "Error", "error");
      }
    } catch (error) {
      showAlert("An unexpected error occurred.", "Error", "error");
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();

    // Agar form submit event manually trigger hota hai
    if (forgotStep === 1) {
      setIsForgotSubmitting(true);
      try {
        const fEmail = forgotEmail.replace(/\s/g, "").toLowerCase();
        const res = await forgotPasswordSendOtp(fEmail);
        if (res.success) {
          setForgotStep(2);
          setOtpTimer(60);
          setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } else {
          showAlert(res.message, "Error", "error");
        }
      } catch (error) {
        showAlert("An unexpected error occurred.", "Error", "error");
      } finally {
        setIsForgotSubmitting(false);
      }
    } else if (forgotStep === 2) {
      if (otpTimer === 0) {
        showAlert(
          "OTP has expired. Please click on Resend OTP.",
          "Expired",
          "warning",
        );
        return;
      }
      const fOtp = otpValues.join("");
      if (fOtp.length < 6) {
        showAlert(
          "Please enter the complete 6-digit OTP.",
          "Incomplete OTP",
          "warning",
        );
        return;
      }
      // Trigger fallback verification if auto-verify hasn't picked it up yet
      if (!isForgotSubmitting && !isOtpVerified) {
        verifyOtpNow(fOtp);
      }
    } else if (forgotStep === 3) {
      setIsForgotSubmitting(true);
      try {
        const fEmail = forgotEmail.replace(/\s/g, "").toLowerCase();
        const fOtp = otpValues.join("");
        const fPass = forgotNewPass.replace(/\s/g, "");
        const fConfirmPass = forgotConfirmPass.replace(/\s/g, "");

        if (fPass !== fConfirmPass) {
          showAlert(
            "Passwords do not match. Please try again.",
            "Mismatch",
            "warning",
          );
          setIsForgotSubmitting(false);
          return;
        }

        if (!/^[a-zA-Z0-9@]+$/.test(fPass)) {
          showAlert(
            "Password can only contain letters, numbers, and the '@' symbol. No spaces allowed.",
            "Invalid Password",
            "warning",
          );
          setIsForgotSubmitting(false);
          return;
        }

        const res = await resetPassword(fEmail, fOtp, fPass);
        if (res.success) {
          setShowForgotModal(false);
          setForgotStep(1);
          setForgotEmail("");
          setOtpValues(["", "", "", "", "", ""]);
          setForgotNewPass("");
          setForgotConfirmPass("");
          setOtpTimer(0);
          showAlert(res.message, "Password Changed", "success");
        } else {
          showAlert(res.message, "Error", "error");
        }
      } catch (error) {
        showAlert("An unexpected error occurred.", "Error", "error");
      } finally {
        setIsForgotSubmitting(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-bg-light to-[#e0eAFC] p-4 sm:p-8">
      <div className="flex w-full max-w-4xl min-h-[600px] h-fit bg-bg-white rounded-2xl shadow-xl border border-border-color overflow-hidden animate-fade-in">
        <div className="hidden md:flex flex-1 flex-col justify-center items-center p-12 text-center text-white bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
          <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full -top-12 -left-12"></div>
          <div className="absolute w-[200px] h-[200px] bg-white/10 rounded-full -bottom-8 -right-8"></div>
          <i className="fas fa-book-reader text-6xl mb-6 z-10 drop-shadow-md"></i>
          <h1 className="text-4xl font-bold mb-4 z-10 tracking-wide">
            LibMaster
          </h1>
          <p className="text-lg opacity-90 z-10 leading-relaxed font-medium">
            Manage your library with style and efficiency.
          </p>
        </div>

        <div className="flex-[1.2] flex flex-col justify-center p-8 sm:p-12 relative overflow-y-auto">
          <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-text-dark mb-2">
                {isLoginMode ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-text-muted">
                {isLoginMode
                  ? "Please enter your details to sign in."
                  : "Fill in the form below to register as a Student."}
              </p>
            </div>

            {!isLoginMode && (
              <>
                <div className="mb-5">
                  <label className="block font-medium mb-1.5 text-sm text-text-dark">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="mb-5">
                  <label className="block font-medium mb-1.5 text-sm text-text-dark">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.replace(/\s/g, "").toLowerCase(),
                      )
                    }
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    placeholder="johndoe_123"
                    required
                  />
                </div>
                <div className="mb-5">
                  <label className="block font-medium mb-1.5 text-sm text-text-dark">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value.replace(/\s/g, "").toLowerCase())
                    }
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="mb-5">
                  <label className="block font-medium mb-1.5 text-sm text-text-dark">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength="10"
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </>
            )}

            {isLoginMode && (
              <div className="mb-5">
                <label className="block font-medium mb-1.5 text-sm text-text-dark">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(
                      e.target.value.replace(/\s/g, "").toLowerCase(),
                    )
                  }
                  className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                  placeholder="admin@library.com or admin"
                  required
                />
              </div>
            )}

            <div className="mb-8">
              <label className="block font-medium mb-1.5 text-sm text-text-dark">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value.replace(/\s/g, ""))
                  }
                  className="w-full p-3 pr-10 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                  placeholder={
                    isLoginMode ? "••••••••" : "Text, number and @ only"
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <i
                    className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                  ></i>
                </button>
              </div>
              {isLoginMode && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-sm text-primary font-medium hover:underline cursor-pointer transition-all"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-2 bg-primary text-white p-3 rounded-lg font-medium shadow-md transition-all ${isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-[#5b54e0] cursor-pointer"}`}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : isLoginMode ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}{" "}
              {!isSubmitting && <i className="fas fa-arrow-right"></i>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-text-muted">
              {isLoginMode
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              onClick={toggleMode}
              className="text-primary font-bold hover:underline cursor-pointer transition-all"
            >
              {isLoginMode ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-border-color relative">
            <button
              onClick={() => {
                if (!isForgotSubmitting) {
                  setShowForgotModal(false);
                  setForgotStep(1);
                  setForgotEmail("");
                  setOtpValues(["", "", "", "", "", ""]);
                  setForgotNewPass("");
                  setForgotConfirmPass("");
                  setOtpTimer(0);
                  setIsOtpVerified(false);
                }
              }}
              disabled={isForgotSubmitting}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-light text-text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-times"></i>
            </button>
            <h2 className="text-2xl font-bold text-text-dark mb-2">
              Reset Password
            </h2>

            <p className="text-text-muted mb-6 text-sm">
              {forgotStep === 1 &&
                "Enter your registered email address to receive an OTP."}
              {forgotStep === 2 && (
                <span>
                  An OTP has been sent to <strong>{forgotEmail}</strong>.
                </span>
              )}
              {forgotStep === 3 &&
                "Create a new strong password for your account."}
            </p>

            <form onSubmit={handleForgotSubmit}>
              {forgotStep === 1 && (
                <div className="mb-6 animate-fade-in">
                  <label className="block font-medium mb-1.5 text-sm text-text-dark">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) =>
                      setForgotEmail(
                        e.target.value.replace(/\s/g, "").toLowerCase(),
                      )
                    }
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary transition-all text-text-dark"
                    placeholder="Enter your email"
                    required
                    disabled={isForgotSubmitting}
                  />
                </div>
              )}

              {forgotStep === 2 && (
                <div className="mb-6 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2 h-6">
                    <label className="block font-medium text-sm text-text-dark leading-none m-0">
                      Enter OTP
                    </label>
                    <i
                      className={`fa-solid fa-check-circle text-success text-[16px] transition-all duration-300 ease-out ${isOtpVerified ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                    ></i>
                  </div>

                  <div className="flex justify-between gap-2 mb-4">
                    {otpValues.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-xl border ${isOtpVerified ? "border-success bg-success/10 text-success" : digit ? "border-primary bg-primary/5 text-primary" : "border-border-color bg-bg-light text-text-dark"} outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${otpTimer === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={
                          isForgotSubmitting || otpTimer === 0 || isOtpVerified
                        }
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm px-1">
                    <span
                      className={`${otpTimer > 0 ? "text-text-muted" : "text-danger font-bold"}`}
                    >
                      {otpTimer > 0
                        ? `Expires in: ${formatTime(otpTimer)}`
                        : "OTP Expired"}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpTimer > 0 || isForgotSubmitting}
                      className={`font-bold transition-all ${otpTimer > 0 ? "text-text-muted opacity-50 cursor-not-allowed" : "text-primary hover:underline cursor-pointer"}`}
                    >
                      {isForgotSubmitting && !isOtpVerified
                        ? "Sending..."
                        : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="mb-2 animate-fade-in">
                  <div className="mb-4">
                    <label className="block font-medium mb-1.5 text-sm text-text-dark">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotPass ? "text" : "password"}
                        value={forgotNewPass}
                        onChange={(e) =>
                          setForgotNewPass(e.target.value.replace(/\s/g, ""))
                        }
                        className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                        placeholder="Text, number and @ only"
                        required
                        disabled={isForgotSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        <i
                          className={`fas ${showForgotPass ? "fa-eye-slash" : "fa-eye"}`}
                        ></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1.5 text-sm text-text-dark">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showForgotConfirmPass ? "text" : "password"}
                        value={forgotConfirmPass}
                        onChange={(e) =>
                          setForgotConfirmPass(
                            e.target.value.replace(/\s/g, ""),
                          )
                        }
                        className={`w-full p-3 rounded-lg border bg-bg-light outline-none transition-all text-text-dark focus:ring-3 ${forgotConfirmPass && forgotNewPass !== forgotConfirmPass ? "border-danger focus:border-danger focus:ring-danger/10" : "border-border-color focus:border-primary focus:ring-primary/10"}`}
                        placeholder="Re-enter password"
                        required
                        disabled={isForgotSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowForgotConfirmPass(!showForgotConfirmPass)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        <i
                          className={`fas ${showForgotConfirmPass ? "fa-eye-slash" : "fa-eye"}`}
                        ></i>
                      </button>
                    </div>
                    <div className="h-6 mt-1">
                      <p
                        className={`text-danger text-xs font-medium flex items-center gap-1 transition-opacity duration-300 ${forgotConfirmPass && forgotNewPass !== forgotConfirmPass ? "opacity-100" : "opacity-0"}`}
                      >
                        <i className="fa-solid fa-circle-exclamation"></i>{" "}
                        Passwords do not match
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isForgotSubmitting ||
                  (forgotStep === 2 &&
                    (otpTimer === 0 || otpValues.join("").length < 6))
                }
                className={`w-full flex justify-center items-center gap-2 bg-primary text-white p-3 rounded-lg font-medium shadow-md transition-all ${isForgotSubmitting || (forgotStep === 2 && otpTimer === 0) ? "opacity-70 cursor-not-allowed" : "hover:bg-[#5b54e0] cursor-pointer"}`}
              >
                {isForgotSubmitting && !isOtpVerified ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : null}
                {isForgotSubmitting && !isOtpVerified
                  ? "Processing..."
                  : forgotStep === 1
                    ? "Send OTP"
                    : forgotStep === 2
                      ? "Verify OTP"
                      : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
