import { createContext, useContext } from "react";

// live device shown by the device detail tabs
const DeviceInfoContext = createContext(null);

export default DeviceInfoContext;
export const useDeviceInfo = () => useContext(DeviceInfoContext);
