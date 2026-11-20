import {
  usePreferences,
  useUpdatePreferences,
} from "../adapters/react-query/queries";
import { Switch } from "./ui";

/**
 * Cac tuy chon luu theo tai khoan (dung chung moi cuoc choi), gom mot cho de
 * chinh cho tien thay vi rai rac o tung the.
 */
export function GameSettingsPanel() {
  const {
    summaryShowQr,
    summaryShowAvatar,
    roundDownRefunds,
    hideSettledGames,
  } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  return (
    <div className="flex flex-col gap-4 pb-2">
      <Switch
        checked={roundDownRefunds}
        onChange={(next) =>
          updatePreferences.mutate({ roundDownRefunds: next })
        }
        label="Không hoàn tiền lẻ (làm tròn xuống 1.000đ)"
      />
      <Switch
        checked={hideSettledGames}
        onChange={(next) =>
          updatePreferences.mutate({ hideSettledGames: next })
        }
        label="Ẩn cuộc chơi đã thu tiền xong khỏi danh sách"
      />
      <Switch
        checked={summaryShowQr}
        onChange={(next) => updatePreferences.mutate({ summaryShowQr: next })}
        label="Hiện QR chuyển khoản trên ảnh"
      />
      <Switch
        checked={summaryShowAvatar}
        onChange={(next) =>
          updatePreferences.mutate({ summaryShowAvatar: next })
        }
        label="Hiện avatar trước tên trên ảnh"
      />
    </div>
  );
}
