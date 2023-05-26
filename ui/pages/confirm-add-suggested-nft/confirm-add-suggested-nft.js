import { error } from 'console';
import React, { useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import { getTokenTrackerLink } from '@metamask/etherscan-link';
import ActionableMessage from '../../components/ui/actionable-message/actionable-message';
import { PageContainerFooter } from '../../components/ui/page-container';
import { I18nContext } from '../../contexts/i18n';
import { MetaMetricsContext } from '../../contexts/metametrics';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import {
  resolvePendingApproval,
  rejectPendingApproval,
} from '../../store/actions';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsTokenEventSource,
} from '../../../shared/constants/metametrics';
import { AssetType } from '../../../shared/constants/transaction';
import {
  ButtonIcon,
  ButtonLink,
  Icon,
  IconName,
  Text,
} from '../../components/component-library';
import {
  getCurrentChainId,
  getRpcPrefsForCurrentProvider,
  getSuggestedNfts,
  getIpfsGateway,
} from '../../selectors';
import NftDefaultImage from '../../components/app/nft-default-image/nft-default-image';
import { getAssetImageURL, shortenAddress } from '../../helpers/utils/util';
import {
  BorderRadius,
  IconColor,
  TextAlign,
  TextVariant,
} from '../../helpers/constants/design-system';
import Box from '../../components/ui/box/box';

const ConfirmAddSuggestedNFT = () => {
  const t = useContext(I18nContext);
  const dispatch = useDispatch();
  const history = useHistory();

  const mostRecentOverviewPage = useSelector(getMostRecentOverviewPage);
  const suggestedNfts = useSelector(getSuggestedNfts);
  const rpcPrefs = useSelector(getRpcPrefsForCurrentProvider);
  const chainId = useSelector(getCurrentChainId);
  const ipfsGateway = useSelector(getIpfsGateway);
  const trackEvent = useContext(MetaMetricsContext);

  const errorMap = {
    nftAlreadyWatchedError: 'The suggested NFT is already in the user’s wallet',
    ownerFetchError: 'An error occurred while fetching the owner of the NFT',
    wrongOwnerError: 'The user does not own the suggested NFT',
  };
  const handleAddNftsClick = useCallback(async () => {
    await Promise.all(
      suggestedNfts.map(async ({ requestData: { asset, errors }, id }) => {
        const errorKey = Object.entries(errors).find(
          ([, v]) => v === true,
        )?.[0];
        if (errorKey) {
          await dispatch(
            rejectPendingApproval(
              id,
              serializeError(
                new Error(
                  `${errorMap[errorKey]}. Contract Address:${asset.address} TokenId:${asset.tokenId}`,
                ),
              ),
            ),
          );
          return;
        }
        await dispatch(resolvePendingApproval(id, null));

        trackEvent({
          event: MetaMetricsEventName.NftAdded,
          category: MetaMetricsEventCategory.Wallet,
          sensitiveProperties: {
            token_symbol: asset.symbol,
            token_id: asset.tokenId,
            token_contract_address: asset.address,
            source_connection_method: MetaMetricsTokenEventSource.Dapp,
            token_standard: asset.standard,
            asset_type: AssetType.NFT,
          },
        });
      }),
    );
    history.push(mostRecentOverviewPage);
  }, [dispatch, history, trackEvent, mostRecentOverviewPage, suggestedNfts]);

  const handleCancelNftClick = useCallback(async () => {
    await Promise.all(
      suggestedNfts.map(async ({ id, requestData: { errors, asset } }) => {
        const errorKey = Object.entries(errors).find(
          ([, v]) => v === true,
        )?.[0];
        if (errorKey) {
          return await dispatch(
            rejectPendingApproval(
              id,
              serializeError(
                new Error(
                  `${errorMap[errorKey]}. ContractAddress:${asset.address}, TokenId:${asset.tokenId}`,
                ),
              ),
            ),
          );
        }

        dispatch(
          rejectPendingApproval(
            id,
            serializeError(ethErrors.provider.userRejectedRequest()),
          ),
        );
      }),
    );
    history.push(mostRecentOverviewPage);
  }, [dispatch, history, mostRecentOverviewPage, suggestedNfts]);

  const goBackIfNoSuggestedNftsOnFirstRender = () => {
    if (!suggestedNfts.length) {
      history.push(mostRecentOverviewPage);
    }
  };

  useEffect(() => {
    goBackIfNoSuggestedNftsOnFirstRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let origin;
  if (suggestedNfts.length) {
    origin = new URL(suggestedNfts[0].origin)?.host || 'dapp';
  }
  if (suggestedNfts.length === 1) {
    // TODO
  }
  return (
    <div className="page-container">
      <Text
        variant={TextVariant.headingLg}
        textAlign={TextAlign.Center}
        margin={2}
      >
        {t('addSuggestedTokens')}
      </Text>
      <Text variant={TextVariant.bodyMd} textAlign={TextAlign.Center}>
        {t('wantsToAddThisAsset', [<ButtonLink>{origin}</ButtonLink>])}
      </Text>
      {/* {knownTokenActionableMessage} */}
      {/* {reusedTokenNameActionableMessage} */}
      <div className="page-container__content">
        <Box
          className="confirm-add-suggested-nft"
          padding={2}
          borderRadius={BorderRadius.MD}
        >
          <div className="confirm-add-suggested-nft__nft-list">
            {suggestedNfts.map(
              ({
                id,
                requestData: {
                  asset: { address, tokenId, symbol, image, name },
                  errors,
                },
              }) => {
                const nftImageURL = getAssetImageURL(image, ipfsGateway);
                const error = Object.values(errors).find((val) => Boolean(val));
                const blockExplorerLink = getTokenTrackerLink(
                  address,
                  chainId,
                  null,
                  null,
                  {
                    blockExplorerUrl: rpcPrefs?.blockExplorerUrl ?? null,
                  },
                );
                return (
                  <div
                    className="confirm-add-suggested-nft__nft-list-item"
                    key={`${address}-${tokenId}`}
                  >
                    {nftImageURL ? (
                      <img
                        className="confirm-add-suggested-nft__nft-image"
                        src={nftImageURL}
                        alt={name || tokenId}
                      />
                    ) : (
                      <NftDefaultImage className="confirm-add-suggested-nft__nft-image-default" />
                    )}
                    <div className="confirm-add-suggested-nft__nft-sub-details">
                      {rpcPrefs.blockExplorerUrl ? (
                        <ButtonLink
                          className="confirm-add-suggested-nft__nft-name"
                          // this will only work for etherscan
                          href={`${blockExplorerLink}?a=${tokenId}`}
                          title={address}
                          target="_blank"
                        >
                          {name || symbol || shortenAddress(address)}
                        </ButtonLink>
                      ) : (
                        <Text
                          variant={TextVariant.bodySm}
                          className="confirm-add-suggested-nft__nft-name"
                          title={address}
                        >
                          {name || symbol || shortenAddress(address)}
                        </Text>
                      )}
                      <Text
                        variant={TextVariant.bodySm}
                        className="confirm-add-suggested-nft__nft-tokenId"
                      >
                        #{tokenId}
                      </Text>
                    </div>
                    {error ? (
                      <Icon
                        name={IconName.Danger}
                        color={IconColor.warningDefault}
                        style={{ margin: '0, 12px, 0, 8px' }}
                        // TODO add tooltip
                      />
                    ) : (
                      <ButtonIcon
                        className="confirm-add-suggested-nft__nft-remove"
                        iconName={IconName.Close}
                        color={IconColor.warningDefault}
                        disabled={error}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dispatch(
                            rejectPendingApproval(
                              id,
                              serializeError(
                                ethErrors.provider.userRejectedRequest(),
                              ),
                            ),
                          );
                        }}
                      />
                    )}
                  </div>
                );
              },
            )}
          </div>
        </Box>
      </div>
      <PageContainerFooter
        cancelText={t('cancel')}
        submitText={t('addAllNfts')}
        onCancel={handleCancelNftClick}
        onSubmit={handleAddNftsClick}
        disabled={suggestedNfts.every(({ requestData: { errors } }) =>
          Object.values(errors).some((val) => val),
        )}
      />
    </div>
  );
};

export default ConfirmAddSuggestedNFT;
