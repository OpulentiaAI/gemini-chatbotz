import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AuthForm({
  onSubmit,
  children,
  defaultEmail = "",
}: {
  onSubmit: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  return (
    <form
      className="flex flex-col gap-4 px-4 sm:px-16"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit(formData);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-chocolate-600 font-normal dark:text-chocolate-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm border-none"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
        />

        <Label
          htmlFor="password"
          className="text-chocolate-600 font-normal dark:text-chocolate-400"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="bg-muted text-md md:text-sm border-none"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {children}
    </form>
  );
}
