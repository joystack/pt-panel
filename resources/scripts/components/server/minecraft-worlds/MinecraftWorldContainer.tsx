import http from '@/api/http';
import ContentBox from '@/components/elements/ContentBox';
import GreyRowBox from '@/components/elements/GreyRowBox';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import Select from '@/components/elements/Select';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Spinner from '@/components/elements/Spinner';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import tw from 'twin.macro';
import MinecraftWorldRow from './MinecraftWorldRow';

type MapsProvider = 'curseforge' | 'minecraftmaps' | 'minecraftfrance' | 'minecraftfr';

interface MinecraftMap {
    id: string;
    name: string;
    url: string;
    icon_url: string | null;
}

export interface MinecraftWorld {
    name: string;
    defaultable: boolean;
}

interface MinecraftWorldsResponse {
    worlds: MinecraftWorld[];
    defaultWorld: string | null;
}

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [mapsProvider, setMapsProvider] = useState<MapsProvider>('curseforge');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [installing, setInstalling] = useState<boolean>(false);

    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const {
        data: worldsResponse,
        error: worldsError,
        mutate: mutateWorlds,
    } = useSWR<MinecraftWorldsResponse>(`worlds-${uuid}`, async () => {
        const { data } = await http.get(`/api/client/servers/${uuid}/minecraft-worlds`);
        return data;
    });
    const { data: maps, error: mapsError } = useSWR<MinecraftMap[]>(`maps-${mapsProvider}-${searchQuery}`, async () => {
        const { data } = await http.get(`/api/client/servers/${uuid}/minecraft-worlds/maps`, {
            params: {
                provider: mapsProvider,
                searchQuery,
            },
        });
        return data;
    });

    useEffect(() => {
        if (!worldsError && !mapsError) {
            clearFlashes('worlds');
            clearFlashes('maps');
            return;
        }
        if (worldsError) {
            clearAndAddHttpError({ error: worldsError, key: 'worlds' });
        }
        if (mapsError) {
            clearAndAddHttpError({ error: mapsError, key: 'maps' });
        }
    }, [worldsError, mapsError]);

    const installMap = (mapId: string) => {
        setInstalling(true);

        http.post(`/api/client/servers/${uuid}/minecraft-worlds/maps/install`, {
            provider: mapsProvider,
            mapId,
        })
            .then(() => {
                mutateWorlds();
            })
            .finally(() => {
                setInstalling(false);
            });
    };

    return (
        <ServerContentBlock title={'Worlds'}>
            <div css={tw`my-10`}>
                <ContentBox title={'Worlds'} showFlashes='worlds'>
                    {!worldsError && worldsResponse ? (
                        worldsResponse.worlds.length ? (
                            worldsResponse.worlds.map((world, index) => (
                                <MinecraftWorldRow
                                    key={world.name}
                                    isDefault={world.name === worldsResponse.defaultWorld}
                                    className={index > 0 ? 'mt-2' : undefined}
                                    mutate={mutateWorlds}
                                    world={world}
                                />
                            ))
                        ) : (
                            <span>No &quot;Minecraft: Java Edition&quot; worlds have been detected.</span>
                        )
                    ) : (
                        <Spinner centered size='base' />
                    )}
                </ContentBox>
                <ContentBox title={'Maps'} css={tw`mt-8`} showFlashes='maps'>
                    <div css={tw`flex`}>
                        <div css={tw`min-w-[150px]`}>
                            <Label htmlFor='map_provider'>Provider</Label>
                            <Select
                                name='map_provider'
                                value={mapsProvider}
                                onChange={(event) => setMapsProvider(event.target.value as MapsProvider)}
                            >
                                <option value='curseforge'>CurseForge</option>
                                {/*<option value='minecraftmaps'>Minecraft Maps</option>
                                <option value='minecraftfrance'>Minecraft-France</option>
                                <option value='minecraftfr'>Minecraft.fr</option>
                                */}
                            </Select>
                        </div>
                        <div css={tw`ml-3 w-full`}>
                            <Label htmlFor='search_query'>Search query</Label>
                            <Input
                                type='text'
                                name='search_query'
                                value={searchQuery}
                                onChange={(event) => {
                                    setSearchQuery(event.target.value);
                                }}
                            />
                        </div>
                    </div>
                    <div css={tw`mt-3`}>
                        {!installing && !mapsError && maps ? (
                            maps.length ? (
                                maps.map((map, index) => (
                                    <GreyRowBox
                                        css={tw`bg-neutral-600`}
                                        key={map.id}
                                        className={index > 0 ? 'mt-2' : undefined}
                                    >
                                        <img
                                            src={map.icon_url ?? 'https://placehold.co/32'}
                                            css={tw`rounded-md w-8 h-8 sm:w-16 sm:h-16 object-contain flex items-center justify-center bg-neutral-500 sm:p-3`}
                                        />
                                        <a css={tw`ml-3 w-9/12`} href={map.url}>
                                            {map.name}
                                        </a>
                                        <button title='Install' css={tw`ml-auto`} onClick={() => installMap(map.id)}>
                                            <FontAwesomeIcon icon={faDownload} css={tw`h-3 w-3`} />
                                        </button>
                                    </GreyRowBox>
                                ))
                            ) : (
                                <span>No &quot;Minecraft: Java Edition&quot; maps have been found for your query.</span>
                            )
                        ) : (
                            <Spinner centered size='base' />
                        )}
                    </div>
                </ContentBox>
            </div>
        </ServerContentBlock>
    );
};
