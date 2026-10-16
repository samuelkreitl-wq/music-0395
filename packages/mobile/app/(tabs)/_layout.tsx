import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../components/remote-ui';
export default function TabLayout(){return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:C.amber,tabBarInactiveTintColor:C.muted,tabBarStyle:{backgroundColor:C.card,borderTopColor:C.border},tabBarLabelStyle:{fontFamily:'Sora',fontSize:10}}}>
{([['index','Connect','link'],['mixer','Mixer','options'],['clips','Clips','grid'],['play','Play','musical-notes'],['devices','Devices','hardware-chip'],['takes','Takes','mic']] as const).map(([name,title,icon])=><Tabs.Screen key={name} name={name} options={{title,tabBarIcon:({color,size})=><Ionicons name={icon} color={color} size={size}/>}}/>)}<Tabs.Screen name="explore" options={{href:null}}/>
</Tabs>;}
